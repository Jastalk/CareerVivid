
import React from 'react';
import { ResumeData, TemplateProps } from '../../types';
import { Mail, Phone, MapPin } from 'lucide-react';
import InlineEdit from '../InlineEdit';
import { inkOn, readableAccent } from '../../utils/templateInk';

export const BoldTemplate: React.FC<TemplateProps> = ({ resume, themeColor, titleFont, bodyFont, onFocus }) => {
  const { personalDetails, professionalSummary, employmentHistory, education, skills, websites } = resume;

  const titleStyle = { fontFamily: `'${titleFont}', sans-serif` };
  const bodyStyle = { fontFamily: `'${bodyFont}', sans-serif` };

  return (
    <div className="bg-white text-gray-800" style={bodyStyle}>
      <header className="bg-gray-900 text-white p-8 flex justify-between items-center">
        <div>
          <div className="flex gap-3">
              <InlineEdit 
                value={personalDetails.firstName} 
                fieldId="personalDetails.firstName" 
                onFocus={onFocus} 
                className="text-5xl font-black uppercase" 
                style={titleStyle}
                tagName="h1"
                placeholder="FIRST NAME"
              />
              <InlineEdit 
                value={personalDetails.lastName} 
                fieldId="personalDetails.lastName" 
                onFocus={onFocus} 
                className="text-5xl font-black uppercase" 
                style={titleStyle}
                tagName="h1"
                placeholder="LAST NAME"
              />
          </div>
          <InlineEdit 
            value={personalDetails.jobTitle} 
            fieldId="personalDetails.jobTitle" 
            onFocus={onFocus} 
            className="text-2xl font-semibold mt-1 block" 
            style={{...titleStyle, color: readableAccent(themeColor)}}
            tagName="h2"
            placeholder="Job Title"
          />
        </div>
        <div className="text-right text-sm space-y-1">
          <div className="flex items-center justify-end">
              <InlineEdit value={personalDetails.email} fieldId="personalDetails.email" onFocus={onFocus} placeholder="Email" className="truncate max-w-[150px]" />
              <Mail size={14} className="ml-2 flex-shrink-0 transform translate-y-px" />
          </div>
          <div className="flex items-center justify-end">
              <InlineEdit value={personalDetails.phone} fieldId="personalDetails.phone" onFocus={onFocus} placeholder="Phone" />
              <Phone size={14} className="ml-2 flex-shrink-0 transform translate-y-px" />
          </div>
          <div className="flex items-center justify-end">
              <InlineEdit value={personalDetails.address} fieldId="personalDetails.address" onFocus={onFocus} placeholder="Address" />
              <MapPin size={14} className="ml-2 flex-shrink-0 transform translate-y-px" />
          </div>
        </div>
      </header>
      
      <div className="p-8">
        <main className="grid grid-cols-3 gap-8">
          <div className="col-span-2">
            <section className="mb-6">
              <h3 className="text-lg font-extrabold uppercase tracking-wider mb-2" style={titleStyle}>Profile</h3>
              <InlineEdit 
                value={professionalSummary} 
                fieldId="professionalSummary" 
                onFocus={onFocus} 
                className="text-sm leading-relaxed block whitespace-pre-wrap"
                tagName="p"
                placeholder="Summary..."
              />
            </section>
            <section>
              <h3 className="text-lg font-extrabold uppercase tracking-wider mb-3" style={titleStyle}>Experience</h3>
              {employmentHistory.map((job, index) => (
                <div key={job.id} className="mb-4">
                  <div className="flex justify-between items-baseline">
                    <InlineEdit 
                        value={job.jobTitle} 
                        fieldId={`employmentHistory[${index}].jobTitle`} 
                        onFocus={onFocus} 
                        className="text-md font-bold block" 
                        style={titleStyle}
                        tagName="h4"
                        placeholder="Job Title"
                    />
                    <div className="flex gap-1 text-xs text-gray-600 font-semibold">
                        <InlineEdit value={job.startDate} fieldId={`employmentHistory[${index}].startDate`} onFocus={onFocus} placeholder="Start" />
                        <span>-</span>
                        <InlineEdit value={job.endDate} fieldId={`employmentHistory[${index}].endDate`} onFocus={onFocus} placeholder="End" />
                    </div>
                  </div>
                  <InlineEdit 
                    value={job.employer} 
                    fieldId={`employmentHistory[${index}].employer`} 
                    onFocus={onFocus} 
                    className="text-sm italic text-gray-700 block" 
                    tagName="p"
                    placeholder="Employer"
                  />
                  <InlineEdit 
                    value={job.description} 
                    fieldId={`employmentHistory[${index}].description`} 
                    onFocus={onFocus} 
                    className="text-sm mt-1 whitespace-pre-wrap block"
                    tagName="p"
                    placeholder="Description..."
                  />
                </div>
              ))}
            </section>
          </div>
          <div className="col-span-1">
            <section className="mb-6">
              <h3 className="text-lg font-extrabold uppercase tracking-wider mb-3" style={titleStyle}>Skills</h3>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill, index) => (
                  <span key={skill.id} className="inline-flex items-center text-sm font-semibold text-white px-3 py-1" style={{ backgroundColor: themeColor, color: inkOn(themeColor) }}>
                      <InlineEdit value={skill.name} fieldId={`skills[${index}].name`} onFocus={onFocus} placeholder="Skill" />
                  </span>
                ))}
              </div>
            </section>
            <section>
              <h3 className="text-lg font-extrabold uppercase tracking-wider mb-3" style={titleStyle}>Education</h3>
              {education.map((edu, index) => (
                <div key={edu.id} className="mb-4">
                  <InlineEdit 
                    value={edu.degree} 
                    fieldId={`education[${index}].degree`} 
                    onFocus={onFocus} 
                    className="text-md font-bold block" 
                    style={titleStyle}
                    tagName="h4"
                    placeholder="Degree"
                  />
                  <InlineEdit 
                    value={edu.school} 
                    fieldId={`education[${index}].school`} 
                    onFocus={onFocus} 
                    className="text-sm italic block" 
                    tagName="p"
                    placeholder="School"
                  />
                  <div className="flex gap-1 text-xs text-gray-600 font-semibold">
                      <InlineEdit value={edu.startDate} fieldId={`education[${index}].startDate`} onFocus={onFocus} placeholder="Start" />
                      <span>-</span>
                      <InlineEdit value={edu.endDate} fieldId={`education[${index}].endDate`} onFocus={onFocus} placeholder="End" />
                  </div>
                </div>
              ))}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};
