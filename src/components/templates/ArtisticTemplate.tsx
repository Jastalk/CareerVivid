
import React from 'react';
import { ResumeData, TemplateProps } from '../../types';
import { Mail, Phone, MapPin, Globe, Brush } from 'lucide-react';
import InlineEdit from '../InlineEdit';
import { readableAccent } from '../../utils/templateInk';

export const ArtisticTemplate: React.FC<TemplateProps> = ({ resume, themeColor, titleFont, bodyFont, onFocus }) => {
  const { personalDetails, professionalSummary, employmentHistory, education, skills, websites } = resume;

  const titleStyle = { fontFamily: `'${titleFont}', sans-serif` };
  const bodyStyle = { fontFamily: `'${bodyFont}', sans-serif` };
  // A secondary color is derived for this template for better aesthetics
  const secondaryColor = '#4a5568'; // A slate gray, works with most colors

  return (
    <div className="bg-white text-gray-800 relative p-8" style={bodyStyle}>
      <div className="absolute top-0 left-0 w-1/3 h-full -z-1" style={{backgroundColor: `${themeColor}20`}}></div>
      <div className="absolute bottom-0 right-0 w-24 h-24 rounded-tl-full -z-1" style={{backgroundColor: `${secondaryColor}20`}}></div>

      <header className="text-left mb-10">
        <InlineEdit 
            value={personalDetails.firstName} 
            fieldId="personalDetails.firstName" 
            onFocus={onFocus} 
            className="text-6xl font-black block" 
            style={{...titleStyle, color: readableAccent(themeColor)}}
            tagName="h1"
            placeholder="First Name"
        />
        <InlineEdit 
            value={personalDetails.lastName} 
            fieldId="personalDetails.lastName" 
            onFocus={onFocus} 
            className="text-6xl font-black text-gray-800 -mt-4 ml-8 block" 
            style={titleStyle}
            tagName="h1"
            placeholder="Last Name"
        />
        <InlineEdit 
            value={personalDetails.jobTitle} 
            fieldId="personalDetails.jobTitle" 
            onFocus={onFocus} 
            className="text-lg font-semibold mt-2 ml-10 block" 
            style={{...titleStyle, color: secondaryColor}}
            tagName="p"
            placeholder="Job Title"
        />
      </header>

      <main className="grid grid-cols-3 gap-8">
        <aside className="col-span-1">
          {personalDetails.photo && (
            <div className="w-40 h-40 rounded-lg shadow-lg mb-6 overflow-hidden flex items-center justify-center">
              <img src={personalDetails.photo} alt="Profile" className="w-full h-full object-cover" />
            </div>
          )}
          <section className="mb-6">
            <h2 className="font-bold text-lg mb-3" style={{...titleStyle, color: secondaryColor}}>CONTACT</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center">
                  <Mail size={14} className="mr-2 flex-shrink-0 transform translate-y-px" />
                  <InlineEdit value={personalDetails.email} fieldId="personalDetails.email" onFocus={onFocus} placeholder="Email" />
              </div>
              <div className="flex items-center">
                  <Phone size={14} className="mr-2 flex-shrink-0 transform translate-y-px" />
                  <InlineEdit value={personalDetails.phone} fieldId="personalDetails.phone" onFocus={onFocus} placeholder="Phone" />
              </div>
              {websites.map((site, index) => (
                <div key={site.id} className="flex items-center">
                  <Globe size={14} className="mr-2 flex-shrink-0 transform translate-y-px" />
                  <a href={site.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      <InlineEdit value={site.label} fieldId={`websites[${index}].label`} onFocus={onFocus} isLink />
                  </a>
                </div>
              ))}
            </div>
          </section>
          <section>
            <h2 className="font-bold text-lg mb-3" style={{...titleStyle, color: secondaryColor}}>SKILLS</h2>
            <ul className="space-y-1">
              {skills.map((skill, index) => (
                <li key={skill.id} className="text-sm flex items-center">
                    <Brush size={12} className="mr-2" style={{color: readableAccent(themeColor)}}/>
                    <InlineEdit value={skill.name} fieldId={`skills[${index}].name`} onFocus={onFocus} placeholder="Skill" />
                </li>
              ))}
            </ul>
          </section>
        </aside>

        <div className="col-span-2">
          <section className="mb-6">
            <h2 className="font-bold text-lg mb-3" style={{...titleStyle, color: readableAccent(themeColor)}}>ABOUT ME</h2>
            <InlineEdit 
                value={professionalSummary} 
                fieldId="professionalSummary" 
                onFocus={onFocus} 
                className="text-sm leading-relaxed block whitespace-pre-wrap"
                tagName="p"
                placeholder="Summary..."
            />
          </section>
          <section className="mb-6">
            <h2 className="font-bold text-lg mb-3" style={{...titleStyle, color: readableAccent(themeColor)}}>EXPERIENCE</h2>
            {employmentHistory.map((job, index) => (
              <div key={job.id} className="mb-4">
                <InlineEdit 
                    value={job.jobTitle} 
                    fieldId={`employmentHistory[${index}].jobTitle`} 
                    onFocus={onFocus} 
                    className="text-md font-bold block" 
                    style={titleStyle}
                    tagName="h3"
                    placeholder="Job Title"
                />
                <div className="flex gap-1 text-sm italic text-gray-600">
                    <InlineEdit value={job.employer} fieldId={`employmentHistory[${index}].employer`} onFocus={onFocus} placeholder="Employer" />
                    <span>/</span>
                    <InlineEdit value={job.startDate} fieldId={`employmentHistory[${index}].startDate`} onFocus={onFocus} placeholder="Start" />
                    <span>-</span>
                    <InlineEdit value={job.endDate} fieldId={`employmentHistory[${index}].endDate`} onFocus={onFocus} placeholder="End" />
                </div>
                <InlineEdit 
                    value={job.description} 
                    fieldId={`employmentHistory[${index}].description`} 
                    onFocus={onFocus} 
                    className="text-sm mt-1 leading-relaxed whitespace-pre-wrap block"
                    tagName="p"
                    placeholder="Description..."
                />
              </div>
            ))}
          </section>
          <section>
            <h2 className="font-bold text-lg mb-3" style={{...titleStyle, color: readableAccent(themeColor)}}>EDUCATION</h2>
            {education.map((edu, index) => (
              <div key={edu.id}>
                <InlineEdit 
                    value={edu.degree} 
                    fieldId={`education[${index}].degree`} 
                    onFocus={onFocus} 
                    className="text-md font-bold block" 
                    style={titleStyle}
                    tagName="h3"
                    placeholder="Degree"
                />
                <InlineEdit 
                    value={edu.school} 
                    fieldId={`education[${index}].school`} 
                    onFocus={onFocus} 
                    className="text-sm italic text-gray-600 block" 
                    tagName="p"
                    placeholder="School"
                />
              </div>
            ))}
          </section>
        </div>
      </main>
    </div>
  );
};
