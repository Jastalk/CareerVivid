
import React from 'react';
import { ResumeData, TemplateProps } from '../../types';
import { Mail, Phone, MapPin, Code } from 'lucide-react';
import InlineEdit from '../InlineEdit';
import { readableAccent } from '../../utils/templateInk';

export const QuantumTemplate: React.FC<TemplateProps> = ({ resume, themeColor, titleFont, bodyFont, onFocus }) => {
  const { personalDetails, professionalSummary, employmentHistory, education, skills } = resume;

  const titleStyle = { fontFamily: `'${titleFont}', sans-serif` };
  const bodyStyle = { fontFamily: `'${bodyFont}', sans-serif` };

  return (
    <div className="flex min-h-full bg-white" style={bodyStyle}>
      <aside className="w-1/3 bg-gray-900 text-gray-300 p-8">
        <div className="text-center mb-4">
            <div className="flex justify-center gap-2 flex-wrap">
                <InlineEdit 
                    value={personalDetails.firstName} 
                    fieldId="personalDetails.firstName" 
                    onFocus={onFocus} 
                    className="text-4xl font-black text-white" 
                    style={titleStyle}
                    tagName="h1"
                    placeholder="First Name"
                />
                <InlineEdit 
                    value={personalDetails.lastName} 
                    fieldId="personalDetails.lastName" 
                    onFocus={onFocus} 
                    className="text-4xl font-black text-white" 
                    style={titleStyle}
                    tagName="h1"
                    placeholder="Last Name"
                />
            </div>
            <InlineEdit 
                value={personalDetails.jobTitle} 
                fieldId="personalDetails.jobTitle" 
                onFocus={onFocus} 
                className="text-lg block mt-1" 
                style={{...titleStyle, color: readableAccent(themeColor)}}
                tagName="p"
                placeholder="Job Title"
            />
        </div>
        
        <div className="w-full my-6 border-t border-gray-700"></div>

        <section className="mb-6">
          <h2 className="text-md font-bold uppercase tracking-widest mb-3" style={{...titleStyle, color: readableAccent(themeColor)}}>Contact</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center"><Mail size={14} className="mr-3 flex-shrink-0 transform translate-y-px" /><InlineEdit value={personalDetails.email} fieldId="personalDetails.email" onFocus={onFocus} placeholder="Email" /></div>
            <div className="flex items-center"><Phone size={14} className="mr-3 flex-shrink-0 transform translate-y-px" /><InlineEdit value={personalDetails.phone} fieldId="personalDetails.phone" onFocus={onFocus} placeholder="Phone" /></div>
            <div className="flex items-center"><MapPin size={14} className="mr-3 flex-shrink-0 transform translate-y-px" /><InlineEdit value={personalDetails.address} fieldId="personalDetails.address" onFocus={onFocus} placeholder="Address" /></div>
          </div>
        </section>
        
        <section>
          <h2 className="text-md font-bold uppercase tracking-widest mb-3" style={{...titleStyle, color: readableAccent(themeColor)}}>Skills</h2>
          <ul className="space-y-2 text-sm">
            {skills.map((skill, index) => (
              <li key={skill.id} className="flex items-center">
                  <Code size={12} className="mr-2" style={{color: readableAccent(themeColor)}} />
                  <InlineEdit value={skill.name} fieldId={`skills[${index}].name`} onFocus={onFocus} placeholder="Skill" />
              </li>
            ))}
          </ul>
        </section>
      </aside>

      <main className="w-2/3 p-8">
        <section className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2" style={titleStyle}>Profile</h2>
          <InlineEdit 
            value={professionalSummary} 
            fieldId="professionalSummary" 
            onFocus={onFocus} 
            className="text-sm leading-relaxed text-gray-700 block whitespace-pre-wrap"
            tagName="p"
            placeholder="Summary..."
          />
        </section>

        <section className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-3" style={titleStyle}>Work Experience</h2>
          {employmentHistory.map((job, index) => (
            <div key={job.id} className="mb-4">
              <InlineEdit 
                value={job.jobTitle} 
                fieldId={`employmentHistory[${index}].jobTitle`} 
                onFocus={onFocus} 
                className="text-lg font-bold text-gray-800 block" 
                style={titleStyle}
                tagName="h3"
                placeholder="Job Title"
              />
              <div className="flex justify-between text-sm text-gray-600">
                  <InlineEdit value={job.employer} fieldId={`employmentHistory[${index}].employer`} onFocus={onFocus} placeholder="Employer" />
                  <div className="flex gap-1">
                      <InlineEdit value={job.startDate} fieldId={`employmentHistory[${index}].startDate`} onFocus={onFocus} placeholder="Start" />
                      <span>-</span>
                      <InlineEdit value={job.endDate} fieldId={`employmentHistory[${index}].endDate`} onFocus={onFocus} placeholder="End" />
                  </div>
              </div>
              <InlineEdit 
                value={job.description} 
                fieldId={`employmentHistory[${index}].description`} 
                onFocus={onFocus} 
                className="text-sm mt-1 leading-relaxed whitespace-pre-wrap text-gray-700 block"
                tagName="p"
                placeholder="Description..."
              />
            </div>
          ))}
        </section>
        
        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-3" style={titleStyle}>Education</h2>
          {education.map((edu, index) => (
            <div key={edu.id}>
              <InlineEdit 
                value={edu.degree} 
                fieldId={`education[${index}].degree`} 
                onFocus={onFocus} 
                className="font-bold text-lg text-gray-800 block" 
                style={titleStyle}
                tagName="h3"
                placeholder="Degree"
              />
              <div className="flex justify-between text-sm text-gray-600">
                  <InlineEdit value={edu.school} fieldId={`education[${index}].school`} onFocus={onFocus} placeholder="School" />
                  <div className="flex gap-1">
                      <InlineEdit value={edu.startDate} fieldId={`education[${index}].startDate`} onFocus={onFocus} placeholder="Start" />
                      <span>-</span>
                      <InlineEdit value={edu.endDate} fieldId={`education[${index}].endDate`} onFocus={onFocus} placeholder="End" />
                  </div>
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
};
